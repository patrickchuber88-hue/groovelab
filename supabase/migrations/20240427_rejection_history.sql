-- Table to track rejected Stage Ready attempts (Niederlagen)
CREATE TABLE IF NOT EXISTS rejection_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    instrument TEXT NOT NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    comment TEXT
);
