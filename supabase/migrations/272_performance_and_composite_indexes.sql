-- Migration 272: Enterprise+ Performance & Composite Indexes
-- Adds targeted partial and composite indexes for ultra-fast query execution and zero-latency dashboard loads.

-- 1. Active sessions lookup for Live Lab and Teacher Presence widgets
CREATE INDEX IF NOT EXISTS idx_sessions_active_user_station 
ON public.sessions(user_id, station_id) 
WHERE check_out_time IS NULL;

-- 2. Band Shoutbox messages sorting by band and timestamp
CREATE INDEX IF NOT EXISTS idx_band_shoutbox_band_created 
ON public.band_shoutbox(band_id, created_at DESC);

-- 3. Campus Direct Messages conversation lookups
CREATE INDEX IF NOT EXISTS idx_campus_direct_messages_convo 
ON public.campus_direct_messages(sender_id, recipient_id, created_at DESC);

-- 4. Activation days student lookup
CREATE INDEX IF NOT EXISTS idx_activation_days_student_id 
ON public.activation_days(student_id);

-- 5. Pending song submissions for Teacher Dashboard Briefing
CREATE INDEX IF NOT EXISTS idx_user_song_skills_pending_approval 
ON public.user_song_skills(song_id, user_id) 
WHERE is_pending_approval = true;

-- 6. Pending help requests for Live Lab
CREATE INDEX IF NOT EXISTS idx_help_requests_pending_school 
ON public.help_requests(school_id, created_at DESC) 
WHERE status = 'pending';

-- 7. School users role and activity composite index
CREATE INDEX IF NOT EXISTS idx_users_raw_school_role_active 
ON public.users_raw(school_id, role, is_active);

-- Reload PostgREST schema
NOTIFY pgrst, 'reload schema';
