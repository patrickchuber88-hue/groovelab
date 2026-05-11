-- 🛡️ GrooveLab Final Security Lock
-- Führe dieses Skript als LETZTES in deinem Supabase SQL Editor aus.
-- Es schließt alle Sicherheitslücken, die durch die MVP-Entwicklung entstanden sind.

-- 1. AUFRÄUMEN: Bestehende (unsichere) Berechtigungen entziehen
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon; -- Nur Lesen erlauben (optional, besser: gar nichts)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- 2. RLS ÜBERALL AKTIVIEREN
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_song_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_song_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_song_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_proposal_votes ENABLE ROW LEVEL SECURITY;

-- 3. SCHOOL-SCOPED POLICIES (Mandantentrennung)
-- Diese Regeln stellen sicher, dass Nutzer nur Daten ihrer eigenen Schule sehen.

-- Users / Profiles
CREATE POLICY "Users can see profiles from their own school" 
ON users FOR SELECT USING (school_id = (auth.jwt()->>'school_id')::uuid);

CREATE POLICY "Users can update their own profile" 
ON users FOR UPDATE USING (id = auth.uid());

-- Songs & Skills
CREATE POLICY "Anyone in school can see songs" 
ON songs FOR SELECT USING (school_id = (auth.jwt()->>'school_id')::uuid);

CREATE POLICY "Users can see skills from their own school" 
ON user_song_skills FOR SELECT USING (
  EXISTS (SELECT 1 FROM songs WHERE songs.id = user_song_skills.song_id AND songs.school_id = (auth.jwt()->>'school_id')::uuid)
);

CREATE POLICY "Users can manage their own skills" 
ON user_song_skills FOR ALL USING (user_id = auth.uid());

-- Bands
CREATE POLICY "Users can see bands from their own school" 
ON bands FOR SELECT USING (school_id = (auth.jwt()->>'school_id')::uuid);

CREATE POLICY "Band members can manage their bands" 
ON bands FOR ALL USING (
  EXISTS (SELECT 1 FROM band_members WHERE band_id = bands.id AND user_id = auth.uid())
);

-- Band Members
CREATE POLICY "Users can see band members from their own school" 
ON band_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM bands WHERE bands.id = band_members.band_id AND bands.school_id = (auth.jwt()->>'school_id')::uuid)
);

-- Band Songs & Slots (Matching Board)
CREATE POLICY "Users can see band songs from their own school" 
ON band_songs FOR SELECT USING (
  EXISTS (SELECT 1 FROM bands WHERE bands.id = band_songs.band_id AND bands.school_id = (auth.jwt()->>'school_id')::uuid)
);

CREATE POLICY "Users can see slots from their own school" 
ON band_song_slots FOR SELECT USING (
  EXISTS (SELECT 1 FROM band_songs 
          JOIN bands ON bands.id = band_songs.band_id 
          WHERE band_songs.id = band_song_slots.band_song_id 
          AND bands.school_id = (auth.jwt()->>'school_id')::uuid)
);

CREATE POLICY "Users can join/leave slots" 
ON band_song_slots FOR ALL USING (user_id = auth.uid());

-- 4. HINWEIS
-- Diese Regeln sind ein starker Grundschutz. Für einen 100%igen Schutz 
-- müssen ggf. noch Lehrer-spezifische Schreibrechte (role = 'teacher') ergänzt werden.
