-- ==============================================================================
-- MIGRATION 377: ENTERPRISE PRE-LIVE PERFORMANCE & COVERING INDEXES
-- Tier-1 Sub-Millisecond Multi-Tenant Scaling for Live Launch
-- Zero-Downtime, Idempotent High-Speed Covering Indexes
-- ==============================================================================

-- 1. FOKUS_LOGS High-Throughput Covering Indexes
-- Accelerates student dashboard loading, streak calculations, and weekly goal progress
CREATE INDEX IF NOT EXISTS idx_fokus_logs_user_created_covering
ON public.fokus_logs(user_id, created_at DESC)
INCLUDE (id, duration_minutes, duration_seconds, is_extra, flame_level);

CREATE INDEX IF NOT EXISTS idx_fokus_logs_created_at_desc
ON public.fokus_logs(created_at DESC);

-- 2. LESSONS High-Speed Tenant Covering Indexes
-- Accelerates Event Coordinator, teacher daily views, and student lesson schedules
CREATE INDEX IF NOT EXISTS idx_lessons_school_date_status
ON public.lessons(school_id, date, status);

CREATE INDEX IF NOT EXISTS idx_lessons_teacher_date
ON public.lessons(teacher_id, date);

CREATE INDEX IF NOT EXISTS idx_lessons_student_date
ON public.lessons(student_id, date);

-- 3. SCHEDULE_OCCURRENCES Teacher Date Covering Index
-- Accelerates Schedule Board, Calendar Views, and Teacher Dashboards
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_teacher_date_covering
ON public.schedule_occurrences(teacher_id, date)
INCLUDE (id, student_id, room_id, start_time, end_time, status, notes);

-- 4. CLASS_FEED_POSTS & FEED_INTERACTIONS Indexing
-- Accelerates social feed widget, emergency announcements, and read confirmations
CREATE INDEX IF NOT EXISTS idx_class_feed_posts_student_created
ON public.class_feed_posts(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_class_feed_posts_teacher_created
ON public.class_feed_posts(teacher_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_class_feed_posts_pinned_created
ON public.class_feed_posts(is_pinned, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feed_interactions_composite
ON public.feed_interactions(post_id, user_id, interaction_type);

CREATE INDEX IF NOT EXISTS idx_feed_interactions_user_created
ON public.feed_interactions(user_id, created_at DESC);

-- 5. BAND_SONG_SLOTS Fast Orchestration Lookups
-- Accelerates band formation, song assignments, and Live Lab participation
CREATE INDEX IF NOT EXISTS idx_band_song_slots_user_id
ON public.band_song_slots(user_id);

CREATE INDEX IF NOT EXISTS idx_band_song_slots_band_song_id
ON public.band_song_slots(band_song_id);

CREATE INDEX IF NOT EXISTS idx_band_song_slots_status
ON public.band_song_slots(status)
WHERE status IS NOT NULL;

-- 6. USER_NOTES Multi-Tenant Composite Indexes
-- Accelerates secretary room issue inbox, teacher scratchpads, and student memos
CREATE INDEX IF NOT EXISTS idx_user_notes_school_created_at
ON public.user_notes(school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notes_user_updated_at
ON public.user_notes(user_id, updated_at DESC);

-- 7. MASTER_AUDIT_TRAIL Forensics & Telemetry Indexes
-- Accelerates Master Admin compliance review, audit streaming, and security alerts
CREATE INDEX IF NOT EXISTS idx_master_audit_trail_created_at_desc
ON public.master_audit_trail(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_master_audit_trail_action_created
ON public.master_audit_trail(action, created_at DESC);

-- 8. Refresh PostgreSQL Query Planner Statistics
ANALYZE public.fokus_logs;
ANALYZE public.lessons;
ANALYZE public.schedule_occurrences;
ANALYZE public.class_feed_posts;
ANALYZE public.feed_interactions;
ANALYZE public.band_song_slots;
ANALYZE public.user_notes;
ANALYZE public.master_audit_trail;

-- 9. Notify PostgREST to Reload Schema Cache
NOTIFY pgrst, 'reload schema';
