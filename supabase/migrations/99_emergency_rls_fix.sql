-- Emergency fix for visibility issues and band matching
ALTER TABLE user_song_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE songs DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_songs DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_song_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_shoutbox DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to authenticated users
GRANT ALL ON user_song_skills TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON songs TO authenticated;
GRANT ALL ON band_songs TO authenticated;
GRANT ALL ON band_song_slots TO authenticated;
GRANT ALL ON band_shoutbox TO authenticated;

-- Grant to service_role (just in case)
GRANT ALL ON user_song_skills TO service_role;
GRANT ALL ON users TO service_role;
GRANT ALL ON songs TO service_role;
GRANT ALL ON band_songs TO service_role;
GRANT ALL ON band_song_slots TO service_role;
GRANT ALL ON band_shoutbox TO service_role;

-- Grant to anon for testing visibility if needed
GRANT ALL ON user_song_skills TO anon;
GRANT ALL ON users TO anon;
GRANT ALL ON songs TO anon;
GRANT ALL ON band_songs TO anon;
GRANT ALL ON band_song_slots TO anon;
GRANT ALL ON band_shoutbox TO anon;
