-- 🚀 GrooveLab Performance Optimization Indexes
-- Fügt Indizes für die am häufigsten abgefragten Spalten bei hoher Last hinzu.

CREATE INDEX IF NOT EXISTS idx_users_raw_school_id ON public.users_raw(school_id);
CREATE INDEX IF NOT EXISTS idx_songs_school_id ON public.songs(school_id);
CREATE INDEX IF NOT EXISTS idx_user_song_skills_user_id ON public.user_song_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_band_members_user_id ON public.band_members(user_id);
CREATE INDEX IF NOT EXISTS idx_band_members_band_id ON public.band_members(band_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_check_out_time ON public.sessions(check_out_time);
