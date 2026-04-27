CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  artist TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_song_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  progress_percent INTEGER DEFAULT 0,
  is_stage_ready BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed data for School 1
INSERT INTO songs (id, school_id, artist, title) VALUES
('66666666-6666-6666-6666-666666666661', '11111111-1111-1111-1111-111111111111', 'Nirvana', 'Smells Like Teen Spirit'),
('66666666-6666-6666-6666-666666666662', '11111111-1111-1111-1111-111111111111', 'The White Stripes', 'Seven Nation Army')
ON CONFLICT DO NOTHING;

-- Seed data for Alex M. (user '44444444-4444-4444-4444-444444444444', Guitar)
INSERT INTO user_song_skills (user_id, song_id, instrument, progress_percent, is_stage_ready) VALUES
('44444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666661', 'Guitar', 100, TRUE),
('44444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666662', 'Guitar', 85, FALSE)
ON CONFLICT DO NOTHING;

-- Seed dummy data to show matching on Wall
-- Dummy Drummer for Teen Spirit
INSERT INTO users (id, school_id, role, first_name, last_name, instrument) VALUES
('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'student', 'Dave', 'G.', 'Drums') ON CONFLICT DO NOTHING;

INSERT INTO user_song_skills (user_id, song_id, instrument, progress_percent, is_stage_ready) VALUES
('77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666661', 'Drums', 100, TRUE)
ON CONFLICT DO NOTHING;
