-- ==============================================================================
-- MIGRATION 337: ENTERPRISE COVERING INDEXES & ZERO-HEAP QUERY OPTIMIZATION
-- Tier-1 Goldstandard Performance Suite for Sub-Millisecond Multi-Tenant Scaling
-- ==============================================================================

-- 1. Users Roster Zero-Heap Covering Index
CREATE INDEX IF NOT EXISTS idx_users_raw_roster_covering
ON public.users_raw(school_id, role, is_active)
INCLUDE (id, first_name, last_name, avatar_url, instrument, teacher_id);

-- 2. Schedule Planner Zero-Heap Covering Index
CREATE INDEX IF NOT EXISTS idx_schedules_planner_covering
ON public.schedules(school_id, day_of_week)
INCLUDE (id, teacher_id, student_id, room_id, start_time, end_time, subject);

-- 3. Schedule Occurrences Date Covering Index
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_date_covering
ON public.schedule_occurrences(student_id, date)
INCLUDE (id, teacher_id, room_id, start_time, end_time, status, notes);

-- 4. Direct Messages Active Unread Covering Index
CREATE INDEX IF NOT EXISTS idx_direct_messages_active_covering
ON public.campus_direct_messages(recipient_id, is_read, created_at DESC)
INCLUDE (id, sender_id, message);

-- 5. Songs Catalog Campus/GrooveLab Covering Index
CREATE INDEX IF NOT EXISTS idx_songs_school_active_covering
ON public.songs(school_id, is_campus_active)
INCLUDE (id, title, artist, tempo_bpm, genre);

-- 6. Lehrwerke Catalog Covering Index
CREATE INDEX IF NOT EXISTS idx_lehrwerke_school_covering
ON public.lehrwerke(school_id)
INCLUDE (id, title, author, total_pages);

-- 7. Student Progress Matrix Covering Index
CREATE INDEX IF NOT EXISTS idx_progress_matrix_student_covering
ON public.progress_matrix(student_id, updated_at DESC)
INCLUDE (id, topic_name, status, is_current_homework, progress_percent);

-- 8. User Song Skills Student Covering Index
CREATE INDEX IF NOT EXISTS idx_user_song_skills_student_covering
ON public.user_song_skills(user_id, status)
INCLUDE (id, song_id, progress_percent, is_current_homework);

-- 9. Focus Sessions Logbook Covering Index
CREATE INDEX IF NOT EXISTS idx_focus_sessions_student_covering
ON public.focus_sessions(student_id, created_at DESC)
INCLUDE (id, duration_seconds, xp_earned, flame_awarded);

-- 10. Session Leases Device Security Covering Index
CREATE INDEX IF NOT EXISTS idx_session_leases_active_covering
ON public.session_leases(user_id, is_revoked)
INCLUDE (id, school_id, device_name, device_key, last_active_at);

-- 11. Refresh PostgreSQL Query Planner Statistics
ANALYZE public.users_raw;
ANALYZE public.schedules;
ANALYZE public.schedule_occurrences;
ANALYZE public.campus_direct_messages;
ANALYZE public.songs;
ANALYZE public.lehrwerke;
ANALYZE public.progress_matrix;
ANALYZE public.user_song_skills;
ANALYZE public.focus_sessions;
ANALYZE public.session_leases;

-- 12. Notify PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
