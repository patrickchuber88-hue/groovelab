-- Migration 277: Dual Metacognition Match Model columns for user_song_skills and progress_matrix

ALTER TABLE IF EXISTS user_song_skills
ADD COLUMN IF NOT EXISTS student_rating integer,
ADD COLUMN IF NOT EXISTS is_match_mode_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_matched_at timestamptz,
ADD COLUMN IF NOT EXISTS last_matched_teacher_percent integer,
ADD COLUMN IF NOT EXISTS last_matched_student_percent integer,
ADD COLUMN IF NOT EXISTS is_match_successful boolean,
ADD COLUMN IF NOT EXISTS student_rating_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS teacher_rating_updated_at timestamptz;

ALTER TABLE IF EXISTS progress_matrix
ADD COLUMN IF NOT EXISTS student_rating integer,
ADD COLUMN IF NOT EXISTS is_match_mode_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_matched_at timestamptz,
ADD COLUMN IF NOT EXISTS last_matched_teacher_percent integer,
ADD COLUMN IF NOT EXISTS last_matched_student_percent integer,
ADD COLUMN IF NOT EXISTS is_match_successful boolean;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
