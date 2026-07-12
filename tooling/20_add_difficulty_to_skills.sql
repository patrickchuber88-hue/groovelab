ALTER TABLE user_song_skills
ADD COLUMN difficulty_level text NOT NULL DEFAULT 'original' CHECK (difficulty_level IN ('starter', 'original'));

-- Ensure a user can have both 'starter' and 'original' for the same song by dropping the old unique constraint and creating a new one
ALTER TABLE user_song_skills
DROP CONSTRAINT IF EXISTS user_song_skills_user_id_song_id_key;

ALTER TABLE user_song_skills
ADD CONSTRAINT user_song_skills_user_id_song_id_difficulty_level_key UNIQUE (user_id, song_id, difficulty_level);
