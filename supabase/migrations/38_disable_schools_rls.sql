-- 🔓 GrooveLab Global RLS Disable & Access Fix
-- Führe diesen SQL-Code in deinem Supabase SQL-Editor aus.
-- Da die App komplett clientseitig ohne Standard-Supabase Auth arbeitet,
-- laufen alle Frontend-Zugriffe als "anon". Jegliches RLS blockiert Schreibzugriffe.
-- Dieses Skript deaktiviert RLS für ALLE verbleibenden Tabellen komplett, um den vollen App-Betrieb zu sichern.

ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE stations DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE bands DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_gigs DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_media DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_song_proposals DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_proposal_votes DISABLE ROW LEVEL SECURITY;

-- Sicherstellen, dass der "anon"-User Vollzugriff (Schreiben/Lesen) auf alle Tabellen hat
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
