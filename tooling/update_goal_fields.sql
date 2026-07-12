-- Erweiterung für interaktives Tagesziel und Feedback
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS daily_goal TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS daily_goal_completed BOOLEAN DEFAULT FALSE;

-- Tabelle für Live-Feedback-Benachrichtigungen
CREATE TABLE IF NOT EXISTS live_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE
);

-- RLS deaktivieren für die neue Tabelle
ALTER TABLE live_feedback DISABLE ROW LEVEL SECURITY;
